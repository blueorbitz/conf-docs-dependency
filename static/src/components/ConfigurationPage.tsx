import React, { useEffect, useState } from 'react';
import { invoke } from '../utils';

const ConfigurationPage = () => {
  const [data, setData] = useState(null);

  const fetchText = async () => {
    const result = await invoke('getText', { example: 'button onclick' });
    setData(result);
  };

  useEffect(() => {
    fetchText();
  }, []);

  return (
    <div>
      {data == null
        ? 'Loading...'
        : <>
          <button onClick={fetchText}>Click me</button>
        </>
      }
    </div>
  );
};

export default ConfigurationPage;