import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AppContext } from './context';
import { invoke } from './utils';
import { FlagsProvider } from '@atlaskit/flag';
import Blanket from '@atlaskit/blanket';
import Spinner from '@atlaskit/spinner';
import ConfigurationPage from './components/ConfigurationPage';
import VisualizeNodePage from './components/VisualizeNodePage';
import QuickGlancePage from './components/QuickGlancePage';

const SpinnerDiv = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  -webkit-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
`;

const App = () => {
  const [context, setContext] = useState(null);

  const getContext = async () => {
    try {
      const result: Record<string, unknown> = await invoke('getContext');

      setContext({
        spinner: false,
        ...result,
      });
    } catch (e) {
      setContext({
        moduleKey: e.message,
        spinner: false,
      });
      console.error('Error: ', e.message);
    }
  };
  useEffect(() => {
    getContext();
  }, []);

  const renderContext = () => {
    if (context) {
      switch (context.moduleKey) {
        case 'setup-space':
          return <ConfigurationPage />;
        case 'visual-space':
          return <VisualizeNodePage />;
        case 'quick-glance':
          return <QuickGlancePage context={context} />;
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
