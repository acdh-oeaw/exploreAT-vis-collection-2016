import { AppContainer } from 'react-hot-loader';
import React from 'react';
import ReactDOM from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import MainApp from './containers/MainApp.jsx'




// remove tap delay, essential for MaterialUI to work properly
injectTapEventPlugin();



const render = Component => {
    ReactDOM.render(
        <AppContainer>
            <Component />
        </AppContainer>,
        document.getElementById('react-app')
    )
};

render(MainApp);

if (module.hot) {
    module.hot.accept('./containers/MainApp.jsx', () => { render(MainApp) })
}





