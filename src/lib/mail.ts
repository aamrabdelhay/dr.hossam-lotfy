import 'server-only';
import net from 'node:net';
import tls from 'node:tls';

/**
 * Minimal SMTP client built on Node's standard library (no external deps).
 * Configured entirely through environment variables that already exist on
 * Vercel: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS (App
 * Password), SMTP_FROM. Every public helper is fail-soft — a broken mail
 * server must never break a request, a login or a build.
 */

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const secure = process.env.SMTP_SECURE === 'true';
  return {
    host,
    port: Number(process.env.SMTP_PORT || (secure ? 465 : 587)),
    secure,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
  };
}

export function isMailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

/** Comma / newline separated list of admin recipients for notifications. */
export function adminNotifyEmails(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Standard CC list for session reminders & task notifications: the office
 * notify list + the principal (Dr. Hossam Lotfy) + the admin e-mail, all
 * de-duplicated case-insensitively.
 */
export function officeCcRecipients(principalEmail?: string | null): string[] {
  return dedupeEmails([...adminNotifyEmails(), process.env.ADMIN_EMAIL, principalEmail]);
}

type SmtpSocket = net.Socket | tls.TLSSocket;

/**
 * Hard deadlines. Vercel's serverless functions are killed after a few seconds;
 * a hung SMTP socket (a very common outcome when outbound 465/587 is filtered)
 * would otherwise take the whole HTTP request down with it — which is exactly
 * how "تعذر إنشاء المهمة" appears even though the task was created.
 */
const CONNECT_TIMEOUT_MS = Number(process.env.SMTP_CONNECT_TIMEOUT_MS || 7000);
const REPLY_TIMEOUT_MS = Number(process.env.SMTP_REPLY_TIMEOUT_MS || 7000);
const TOTAL_TIMEOUT_MS = Number(process.env.SMTP_TOTAL_TIMEOUT_MS || 20000);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`SMTP timeout after ${ms}ms during ${label}`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function connectTls(host: string, port: number): Promise<tls.TLSSocket> {
  return withTimeout(
    new Promise<tls.TLSSocket>((resolve, reject) => {
      const sock = tls.connect({ host, port, servername: host });
      sock.setTimeout(CONNECT_TIMEOUT_MS);
      sock.once('secureConnect', () => {
        sock.setTimeout(0);
        resolve(sock);
      });
      sock.once('timeout', () => {
        sock.destroy();
        reject(new Error('SMTP TLS connect timed out'));
      });
      sock.once('error', reject);
    }),
    CONNECT_TIMEOUT_MS + 1000,
    'tls connect',
  );
}

function connectPlain(host: string, port: number): Promise<net.Socket> {
  return withTimeout(
    new Promise<net.Socket>((resolve, reject) => {
      const sock = net.connect({ host, port });
      sock.setTimeout(CONNECT_TIMEOUT_MS);
      sock.once('connect', () => {
        sock.setTimeout(0);
        resolve(sock);
      });
      sock.once('timeout', () => {
        sock.destroy();
        reject(new Error('SMTP connect timed out'));
      });
      sock.once('error', reject);
    }),
    CONNECT_TIMEOUT_MS + 1000,
    'connect',
  );
}

function upgradeToTls(sock: net.Socket, host: string): Promise<tls.TLSSocket> {
  return withTimeout(
    new Promise<tls.TLSSocket>((resolve, reject) => {
      const secure = tls.connect({ socket: sock, servername: host });
      secure.once('secureConnect', () => resolve(secure));
      secure.once('error', reject);
    }),
    CONNECT_TIMEOUT_MS + 1000,
    'starttls',
  );
}

function write(sock: SmtpSocket, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sock.write(line, (err) => (err ? reject(err) : resolve()));
  });
}

/** Read one complete SMTP reply ("NNN " terminates; "NNN-" continues). */
function readReply(sock: SmtpSocket): Promise<{ code: number; text: string }> {
  return withTimeout(
    new Promise<{ code: number; text: string }>((resolve, reject) => {
      let buffer = '';
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\r\n');
        for (let i = 0; i < lines.length; i++) {
          if (/^\d{3} /.test(lines[i])) {
            cleanup();
            resolve({ code: Number(lines[i].slice(0, 3)), text: lines[i].slice(4) });
            return;
          }
        }
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onClose = () => {
        cleanup();
        reject(new Error('SMTP connection closed unexpectedly'));
      };
      const cleanup = () => {
        sock.off('data', onData);
        sock.off('error', onError);
        sock.off('close', onClose);
      };
      sock.on('data', onData);
      sock.once('error', onError);
      sock.once('close', onClose);
    }),
    REPLY_TIMEOUT_MS,
    'awaiting reply',
  );
}

async function expect(sock: SmtpSocket, expected: number[]): Promise<void> {
  const reply = await readReply(sock);
  if (!expected.includes(reply.code)) {
    throw new Error(`SMTP unexpected reply ${reply.code}: ${reply.text}`);
  }
}

function b64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

function wrapB64(raw: string): string {
  return raw.replace(/(.{76})/g, '$1\r\n').replace(/\r\n$/, '');
}

function encodedWord(s: string): string {
  return `=?UTF-8?B?${b64(s)}?=`;
}

function buildMessage(cfg: SmtpConfig, toRecipients: string[], ccRecipients: string[], subject: string, text: string): string {
  const headers = [
    `From: DR. HOSSAM LOTFY LAW FIRM <${cfg.from}>`,
    `To: ${toRecipients.join(', ')}`,
    ...(ccRecipients.length > 0 ? [`Cc: ${ccRecipients.join(', ')}`] : []),
    `Subject: ${encodedWord(subject)}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(16).slice(2)}@loutfilawfirm.net>`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  return `${headers.join('\r\n')}\r\n\r\n${wrapB64(b64(text))}`;
}

/** Normalise and de-duplicate a list of e-mail recipients (case-insensitive). */
export function dedupeEmails(emails: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const e = (raw ?? '').trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export async function sendMail(opts: { to: string | string[]; cc?: string | string[]; subject: string; text: string }): Promise<void> {
  const cfg = getSmtpConfig();
  if (!cfg) throw new Error('SMTP is not configured');

  const toRecipients = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((s) => s.trim())
    .filter(Boolean);
  const ccRecipients = (Array.isArray(opts.cc) ? opts.cc : opts.cc ? [opts.cc] : [])
    .map((s) => s.trim())
    .filter(Boolean);
  const recipients = dedupeEmails([...toRecipients, ...ccRecipients]);
  if (recipients.length === 0) return;

  await withTimeout(
    deliver(cfg, toRecipients, ccRecipients, recipients, opts.subject, opts.text),
    TOTAL_TIMEOUT_MS,
    'delivery',
  );
}

async function deliver(
  cfg: SmtpConfig,
  toRecipients: string[],
  ccRecipients: string[],
  recipients: string[],
  subject: string,
  text: string,
): Promise<void> {
  let sock: SmtpSocket;
  if (cfg.secure) {
    sock = await connectTls(cfg.host, cfg.port);
  } else {
    sock = await connectPlain(cfg.host, cfg.port);
  }

  try {
    await expect(sock, [220]);
    await write(sock, 'EHLO loutfilawfirm.net\r\n');
    await expect(sock, [250]);

    if (!cfg.secure) {
      await write(sock, 'STARTTLS\r\n');
      await expect(sock, [220]);
      sock = await upgradeToTls(sock as net.Socket, cfg.host);
      await write(sock, 'EHLO loutfilawfirm.net\r\n');
      await expect(sock, [250]);
    }

    await write(sock, 'AUTH LOGIN\r\n');
    await expect(sock, [334]);
    await write(sock, `${b64(cfg.user)}\r\n`);
    await expect(sock, [334]);
    await write(sock, `${b64(cfg.pass)}\r\n`);
    await expect(sock, [235]);

    await write(sock, `MAIL FROM:<${cfg.from}>\r\n`);
    await expect(sock, [250]);
    for (const rcpt of recipients) {
      await write(sock, `RCPT TO:<${rcpt}>\r\n`);
      await expect(sock, [250, 251]);
    }

    await write(sock, 'DATA\r\n');
    await expect(sock, [354]);
    await write(sock, `${buildMessage(cfg, toRecipients, ccRecipients, subject, text)}\r\n.\r\n`);
    await expect(sock, [250]);
    await write(sock, 'QUIT\r\n').catch(() => undefined);
  } finally {
    sock.destroy();
  }
}

/** Fail-soft send: logs and never throws. */
export async function trySendMail(opts: { to: string | string[]; cc?: string | string[]; subject: string; text: string }): Promise<boolean> {
  try {
    await sendMail(opts);
    return true;
  } catch (err) {
    console.error('[mail] failed to send:', (err as Error)?.message ?? err);
    return false;
  }
}

/** Notify the office that a new lawyer is waiting for approval. */
export async function notifyNewRegistration(name: string, email: string, phone: string | null): Promise<void> {
  const to = adminNotifyEmails();
  if (to.length === 0) return;
  await trySendMail({
    to,
    subject: 'طلب اعتماد محامٍ جديد — DR. HOSSAM LOTFY LAW FIRM',
    text: [
      'وصل طلب تسجيل محامٍ جديد وهو بانتظار الاعتماد.',
      '',
      `الاسم: ${name}`,
      `البريد (Gmail): ${email}`,
      phone ? `الهاتف: ${phone}` : '',
      '',
      'راجع قسم "المحامون" في منطقة الإدارة لاعتماد الطلب أو رفضه.',
    ]
      .filter((l) => l !== '')
      .join('\n'),
  });
}

/** Tell the lawyer their account has been approved. */
export async function notifyLawyerApproved(email: string, name: string, siteUrl: string): Promise<void> {
  await trySendMail({
    to: email,
    subject: 'تم اعتماد حسابك — DR. HOSSAM LOTFY LAW FIRM',
    text: [
      `مرحباً ${name}،`,
      '',
      'تم اعتماد حسابك من إدارة المكتب. يمكنك الآن تسجيل الدخول بحساب Gmail الخاص بك ونشر وتعديل مهامك.',
      '',
      `رابط الدخول: ${siteUrl}/auth`,
      '',
      'DR. HOSSAM LOTFY LAW FIRM',
    ].join('\n'),
  });
}

/** Reminder for an upcoming session. */
export async function sendSessionReminder(opts: {
  to: string;
  cc?: string[];
  lawyerName: string;
  taskDesc: string;
  locationName: string;
  dateLabel: string;
  timeLabel: string;
  url: string;
  /** Human label for the reminder window (e.g. "14 يوماً"). */
  windowLabel?: string;
}): Promise<boolean> {
  return trySendMail({
    to: opts.to,
    cc: opts.cc,
    subject: `تذكير بجلسة${opts.windowLabel ? ` — قبل ${opts.windowLabel}` : ''} — DR. HOSSAM LOTFY LAW FIRM`,
    text: [
      `مرحباً ${opts.lawyerName}،`,
      '',
      opts.windowLabel
        ? `تذكير بموعد الجلسة/المهمة التالية (قبل ${opts.windowLabel} من الموعد):`
        : 'تذكير بموعد الجلسة/المهمة التالية:',
      '',
      `المهمة: ${opts.taskDesc}`,
      `المكان: ${opts.locationName}`,
      `التاريخ: ${opts.dateLabel}`,
      opts.timeLabel ? `الساعة: ${opts.timeLabel}` : '',
      '',
      `التفاصيل: ${opts.url}`,
      '',
      'DR. HOSSAM LOTFY LAW FIRM',
    ]
      .filter((l) => l !== '')
      .join('\n'),
  });
}

/** Notify a lawyer that a task was created and assigned to them. */
export async function sendTaskAssignedEmail(opts: {
  to: string;
  cc?: string[];
  lawyerName: string;
  taskDesc: string;
  locationName: string;
  dateLabel: string;
  timeLabel: string;
  url: string;
}): Promise<boolean> {
  return trySendMail({
    to: opts.to,
    cc: opts.cc,
    subject: 'مهمة جديدة — DR. HOSSAM LOTFY LAW FIRM',
    text: [
      `مرحباً ${opts.lawyerName}،`,
      '',
      'تم إسناد مهمة جديدة إليك:',
      '',
      `المهمة: ${opts.taskDesc}`,
      `المكان: ${opts.locationName}`,
      opts.dateLabel ? `التاريخ: ${opts.dateLabel}` : '',
      opts.timeLabel ? `الساعة: ${opts.timeLabel}` : '',
      '',
      `التفاصيل: ${opts.url}`,
      '',
      'DR. HOSSAM LOTFY LAW FIRM',
    ]
      .filter((l) => l !== '')
      .join('\n'),
  });
}

/**
 * Office copy for EVERY newly created task.
 *
 * The per-lawyer notification only fires when the lawyer has a Gmail identity
 * on file, so an office with no Google-linked lawyers received *nothing*. The
 * admin always wants a copy, so this is sent independently of the assignees'
 * mail addresses.
 */
export async function notifyOfficeTaskCreated(opts: {
  taskDesc: string;
  locationName: string;
  dateLabel: string;
  timeLabel: string;
  assignees: string[];
  clientName?: string | null;
  caseLabel?: string | null;
  createdBy: string;
  url: string;
}): Promise<boolean> {
  const to = officeCcRecipients(null);
  if (to.length === 0) return false;
  return trySendMail({
    to,
    subject: 'مهمة جديدة أُضيفت — DR. HOSSAM LOTFY LAW FIRM',
    text: [
      'تم إنشاء مهمة/جلسة جديدة على منصة المكتب:',
      '',
      `المهمة: ${opts.taskDesc}`,
      `المكان: ${opts.locationName}`,
      opts.caseLabel ? `القضية: ${opts.caseLabel}` : '',
      opts.clientName ? `العميل: ${opts.clientName}` : '',
      opts.dateLabel ? `التاريخ: ${opts.dateLabel}` : 'التاريخ: بالتنسيق',
      opts.timeLabel ? `الساعة: ${opts.timeLabel}` : '',
      opts.assignees.length > 0 ? `المكلفون: ${opts.assignees.join('، ')}` : '',
      `أضافها: ${opts.createdBy}`,
      '',
      `التفاصيل: ${opts.url}`,
      '',
      'DR. HOSSAM LOTFY LAW FIRM',
    ]
      .filter((l) => l !== '')
      .join('\n'),
  });
}
