// @flow weak

import React from 'react';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import PropTypes from 'prop-types';
import Typography from 'material-ui/Typography';

import { Link, withRouter } from 'react-router-dom';
import Auth from '../modules/Auth';
import Button from 'material-ui/Button';
import Menu, { MenuItem } from 'material-ui/Menu';

import Grid from 'material-ui/Grid';

import MoreVert from 'material-ui-icons/MoreVert';

import { withStyles, createStyleSheet } from 'material-ui/styles';



const Login = (props) => (
    <div>
        <Link to="/login"><Button {...props} contrast key={1}>Login</Button></Link>
        <Link to="/signup"><Button {...props} contrast key={2}>Sign up</Button></Link>
    </div>
);

Login.muiName = 'Button';


const Logged = withRouter((props) => {
    // const LogoutMenuItem = withRouter((props) => (
    //     <MenuItem
    //               onTouchTap={() => {
    //                   const { history } = props;
    //                   Auth.deauthenticateUser();
    //                   history.push('/');
    //               }}
    //     > Log Out </MenuItem>
    // ));
    // return ( <Menu>
    //             <MenuItem>Mama</MenuItem>
    //             <MenuItem>Papa</MenuItem>
    //             {/*{<LogoutMenuItem/>}*/}
    //         </Menu>);

    return <Button contrast onTouchTap={() => {
        const { history } = props;
        Auth.deauthenticateUser();
        history.push('/');
    }}>Sign out</Button>
});

// Logged.muiName = 'IconMenu';


const styleSheet = createStyleSheet('Base', () => ({
    root: {
        position: 'relative',
        width: '100%',
    },
    appBar: {
        position: 'relative',
    },
    flex: {
        flex: 1,
    },
}));


class Base extends React.Component {
    /**
     * Class constructor.
     */
    constructor(props) {
        super(props);
        this.classes = props.classes;
    }

    render() {
        return (
            <div className={this.classes.root}>
                <AppBar className={this.classes.appBar}>
                    <Toolbar>
                        <Typography type="title" colorInherit className={this.classes.flex}>Explore.AT!</Typography>
                            {Auth.isUserAuthenticated() ? <Logged/> : <Login/>}
                    </Toolbar>
                </AppBar>
                {this.props.children}
            </div>
        );
    }
}

Base.propTypes = {
    children: PropTypes.object.isRequired
};

export default withStyles(styleSheet)(Base);