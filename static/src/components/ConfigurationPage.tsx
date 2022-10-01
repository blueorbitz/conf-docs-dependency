import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

const ConfigurationPage = () => {
  const [data, setData] = useState(null);

  const fetchText = () => invoke('getText', { example: 'button onclick' }).then(setData);
  const fetchTest = async () => {
    const test = await invoke('getTest');
    console.log(test);
  };

  useEffect(() => {
    fetchText();
  }, []);

  return (
    <div>
      {data == null
        ? 'Loading...'
        : <>
          <button onClick={fetchTest}>Click me</button>
        </>
      }
    </div>
  );
};

export default ConfigurationPage;