import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function Home() {
  const [message, setMessage] = useState<string>('');

useEffect(() => {
  async function testConnection() {
    const { data, error } = await supabase.from('machines').select('*');
    console.log('Supabase Error:', error); // <-- Log the error

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage(`Connected! Rows found: ${data.length}`);
    }
  }
  testConnection();
}, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Supabase Connection Test</h1>
      <p>{message}</p>
    </main>
  );
}
