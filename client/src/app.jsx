import React from 'react';
import ReactDom from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
    BrowserRouter as Router,
    Switch,
    Route
} from 'react-router-dom';

import Base from './components/Base.jsx'
import HomePage from './components/HomePage.jsx';
import LoginPage from './containers/LoginPage.jsx';
import SignUpPage from './containers/SignUpPage.jsx';

import createBrowserHistory from 'history/createBrowserHistory';
import { withRouter } from 'react-router-dom'

const history = createBrowserHistory();

// remove tap delay, essential for MaterialUI to work properly
injectTapEventPlugin();

ReactDom.render((
    <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Router history={history}>
            <Switch>
                <Route exact path='/'   render={() => <Base><HomePage/></Base>}/>
                <Route path='/login'    render={({history}) => <Base><LoginPage history={history}/></Base>}/>
                <Route path='/signup'   render={({history}) => <Base><SignUpPage history={history}/></Base>}/>
            </Switch>
        </Router>
    </MuiThemeProvider>), document.getElementById('react-app'));

