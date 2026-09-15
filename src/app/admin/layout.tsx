'use client';
import * as React from 'react';
import {usePathname} from 'next/navigation';
import {OfficeAssistant} from '@/components/admin/office-assistant';
export default function AdminLayout({children}:{children:React.ReactNode}){const pathname=usePathname();return <>{children}{pathname!=='/admin/login'&&<OfficeAssistant/>}</>}
