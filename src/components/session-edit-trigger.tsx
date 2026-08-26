'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from './ui';
import { SessionEditForm } from './session-edit-form';
import type { NavLocation } from '@/lib/constants';

/** Opens the edit modal from a "تعديل" button or the ?edit=1 URL param. */
export function EditTrigger({
  task,
  locations,
  lawyers,
}: {
  task: {
    id: string;
    description: string;
    notes: string | null;
    locationId: string;
    caseName: string | null;
    caseNumber: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    status: string;
    lawyerIds: string[];
  };
  locations: NavLocation[];
  lawyers: Array<{ id: string; name: string }>;
}) {
  const sp = useSearchParams();
  const [open, setOpen] = React.useState<boolean | null>(null);
  const openState = open ?? sp.get('edit') === '1';

  return (
    <>
      <div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Pencil size={14} />
          تعديل المهمة
        </Button>
      </div>
      <SessionEditForm open={openState} onClose={() => setOpen(false)} task={task} locations={locations} lawyers={lawyers} />
    </>
  );
}
