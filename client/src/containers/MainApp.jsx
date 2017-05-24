import React from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route
} from 'react-router-dom';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import PrivateRoute from '../components/PrivateRoute.jsx';

/*REDUCE SIZE import style
 import Button from 'react-bootstrap/lib/Button';
 import FlatButton from 'material-ui/lib/flat-button';
* */

import HomePage from '../components/HomePage.jsx';
import DashboardPage from '../containers/DashboardPage.jsx';
import LoginPage from '../containers/LoginPage.jsx';
import SignUpPage from '../containers/SignUpPage.jsx';

const MainApp = () => (
    <MuiThemeProvider>
        <Router>
            <Switch>
                <Route exact path='/' component={HomePage}/>
                <Route path='/login'  component={LoginPage}/>
                <Route path='/signup' component={SignUpPage}/>
                <PrivateRoute path='/dashboard/:version?'component={DashboardPage}/>
            </Switch>
        </Router>
    </MuiThemeProvider>
);

export default MainApp;