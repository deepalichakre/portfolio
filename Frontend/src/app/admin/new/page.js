'use client';
import { useState } from 'react';

import AdminProjectForm from '../../../components/admin/AdminProjectForm';

export default function AdminNewProjectPage() {
  return <AdminProjectForm mode="new" initialProject={null} />;
}
