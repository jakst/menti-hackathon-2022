import { useRouter } from 'next/router';
import { useState } from 'react';

export default function PresenterPage() {
  const router = useRouter();
  const [value, setValue] = useState('');

  return (
    <div>
      <input type="text" onChange={(event) => setValue(event.target.value)} />
      <button type="button" onClick={() => router.push(`/${value}/present`)}>
        Present
      </button>
    </div>
  );
}
