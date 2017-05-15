import React from 'react';
import ReactDom from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    withRouter
} from 'react-router-dom';

import Base from './components/Base.jsx'
import HomePage from './components/HomePage.jsx';
import DummyLogoutComponent from './components/DummyLogoutComponent.jsx';
import DashboardPage from './containers/DashboardPage.jsx';
import LoginPage from './containers/LoginPage.jsx';
import SignUpPage from './containers/SignUpPage.jsx';

import Auth from './modules/Auth';

import createBrowserHistory from 'history/createBrowserHistory';
// const history = createBrowserHistory();

// remove tap delay, essential for MaterialUI to work properly
injectTapEventPlugin();


const RouterLogoutComponent = withRouter(DummyLogoutComponent);


ReactDom.render((
    <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Router>
            <Switch>
                <Route exact path='/'
                       render={() => Auth.isUserAuthenticated() ? <Base><DashboardPage/></Base> : <Base><HomePage/></Base>}/>
                <Route path='/login'    render={({history}) => <Base><LoginPage history={history}/></Base>}/>
                <Route path='/signup'   render={({history}) => <Base><SignUpPage history={history}/></Base>}/>
                <Route path='/logout'   component={RouterLogoutComponent}/>
            </Switch>
        </Router>
    </MuiThemeProvider>), document.getElementById('react-app'));

