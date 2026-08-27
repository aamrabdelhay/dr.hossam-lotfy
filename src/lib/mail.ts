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

type SmtpSocket = net.Socket | tls.TLSSocket;

function connectTls(host: string, port: number): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host });
    sock.once('secureConnect', () => resolve(sock));
    sock.once('error', reject);
  });
}

function connectPlain(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port });
    sock.once('connect', () => resolve(sock));
    sock.once('error', reject);
  });
}

function upgradeToTls(sock: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket: sock, servername: host });
    secure.once('secureConnect', () => resolve(secure));
    secure.once('error', reject);
  });
}

function write(sock: SmtpSocket, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sock.write(line, (err) => (err ? reject(err) : resolve()));
  });
}

/** Read one complete SMTP reply ("NNN " terminates; "NNN-" continues). */
function readReply(sock: SmtpSocket): Promise<{ code: number; text: string }> {
  return new Promise((resolve, reject) => {
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
  });
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

function buildMessage(cfg: SmtpConfig, recipients: string[], subject: string, text: string): string {
  const headers = [
    `From: DR. HOSSAM LOTFY LAW FIRM <${cfg.from}>`,
    `To: ${recipients.join(', ')}`,
    `Subject: ${encodedWord(subject)}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(16).slice(2)}@loutfilawfirm.net>`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  return `${headers.join('\r\n')}\r\n\r\n${wrapB64(b64(text))}`;
}

export async function sendMail(opts: { to: string | string[]; subject: string; text: string }): Promise<void> {
  const cfg = getSmtpConfig();
  if (!cfg) throw new Error('SMTP is not configured');

  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

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
    await write(sock, `${buildMessage(cfg, recipients, opts.subject, opts.text)}\r\n.\r\n`);
    await expect(sock, [250]);
    await write(sock, 'QUIT\r\n').catch(() => undefined);
  } finally {
    sock.destroy();
  }
}

/** Fail-soft send: logs and never throws. */
export async function trySendMail(opts: { to: string | string[]; subject: string; text: string }): Promise<boolean> {
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
  lawyerName: string;
  taskDesc: string;
  locationName: string;
  dateLabel: string;
  timeLabel: string;
  url: string;
}): Promise<boolean> {
  return trySendMail({
    to: opts.to,
    subject: 'تذكير بجلسة — DR. HOSSAM LOTFY LAW FIRM',
    text: [
      `مرحباً ${opts.lawyerName}،`,
      '',
      'تذكير بموعد الجلسة/المهمة التالية:',
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
