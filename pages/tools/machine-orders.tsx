// pages/tools/machine-orders.tsx
import Head from 'next/head';
import MachineOrdersTool from '../../components/tools/MachineOrdersTool';

export default function MachineOrdersPage() {
  return (
    <>
      <Head>
        <title>Machine Orders</title>
      </Head>
      <MachineOrdersTool />
    </>
  );
}