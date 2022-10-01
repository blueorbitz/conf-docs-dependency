import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

const ConfigurationPage = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    invoke('getText', { example: 'my-invoke-variable' }).then(setData);
  }, []);

  return (
    <div>
      
      {data == null
        ? 'Loading...'
        : <>
          <button onClick={() => invoke('getText', { example: 'my-invoke-variable' }).then(setData)}>Click me</button>
        </>
      }
    </div>
  );
};

export default ConfigurationPage;