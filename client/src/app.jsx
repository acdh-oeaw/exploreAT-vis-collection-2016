import React from 'react';
import ReactDom from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
    BrowserRouter,
    Switch,
    Route,
    Redirect,
    withRouter
} from 'react-router-dom';

import Base from './components/Base.jsx'
import HomePage from './components/HomePage.jsx';
import DummyLogoutComponent from './components/DummyLogoutComponent.jsx';
import DashboardPage from './containers/DashboardPage.jsx';
import LoginPage from './containers/LoginPage.jsx';
import SignUpPage from './containers/SignUpPage.jsx';

import Auth from './modules/Auth';


// remove tap delay, essential for MaterialUI to work properly
injectTapEventPlugin();


const RouterLogoutComponent = withRouter(DummyLogoutComponent);

const PrivateRoute = ({ component: Component, ...rest }) => (
    <Route {...rest} render={props => (
        Auth.isUserAuthenticated() ? (
            <Component {...props}/>
        ) : (
            <Redirect to={{
                pathname: '/login',
                state: { from: props.location }
            }}/>
        )
    )}/>
);


ReactDom.render((
    <MuiThemeProvider muiTheme={getMuiTheme()}>
        <BrowserRouter>
            <Switch>
                <Route exact path='/'
                       render={() => <HomePage/>}/>
                <Route path='/login'    render={({history}) => <LoginPage history={history}/>}/>
                <Route path='/signup'   render={({history}) => <SignUpPage history={history}/>}/>
                <Route path='/logout'   component={RouterLogoutComponent}/>
                <PrivateRoute path="/dashboard" component={DashboardPage}/>
            </Switch>
        </BrowserRouter>
    </MuiThemeProvider>), document.getElementById('react-app'));

