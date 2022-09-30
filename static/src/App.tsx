import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AppContext } from './context';
import { invoke } from '@forge/bridge';
import { FlagsProvider } from '@atlaskit/flag';
import Blanket from '@atlaskit/blanket';
import Spinner from '@atlaskit/spinner';

const SpinnerDiv = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  -webkit-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
`;

const App = () => {
  const [context, setContext] = useState(null);
  const [data, setData] = useState(null);

  const getContext = async () => {
    try {
      const result: Record<string, unknown> = await invoke('getContext');
      const localId = (result.localId as unknown as string).split('/');

      setContext({
        moduleKey: result.moduleKey as string,
        spinner: false,
        accountId: result.accountId,
        cloudId: result.cloudId,
        appId: localId[1],
        envId: localId[2],
      });
    } catch (e) {
      setContext({
        moduleKey: e.message,
        spinner: false,
        accountId: null,
        cloudId: null,
        appId: null,
        envId: null,
        license: null,
        session: null,
      });
      console.error('Error: ', e.message);
    }
  };
  useEffect(() => {
    getContext();

    // Do your stuff here
    invoke('getText', { example: 'my-invoke-variable' }).then(setData);
  }, []);

  const renderContext = () => {
    if (context) {
      switch (context.moduleKey) {
        case 'hello-world-space':
          return (
            <div>
              {data ? data : 'Loading...'}
            </div>
          );
        default:
          return <>Some error had been occured. {context.moduleKey}</>;
      }
    }
  };

  return (
    <AppContext.Provider
      value={{ ...context, toggleSpinner: (show: boolean) => setContext({ ...context, spinner: show }) }}
    >
      {(!context || context.spinner) && (
        <Blanket isTinted={false} shouldAllowClickThrough={false} testId="blanket-with-children">
          <SpinnerDiv>
            <Spinner size="large" />
          </SpinnerDiv>
        </Blanket>
      )}
      <FlagsProvider>{renderContext()}</FlagsProvider>
    </AppContext.Provider>
  );
};

export default App;
