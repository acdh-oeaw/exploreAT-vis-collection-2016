import React from 'react';
import AppBar from 'material-ui/AppBar';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router-dom';
import Auth from '../modules/Auth';
import FlatButton from 'material-ui/FlatButton';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';



const Login = (props) => (
    <div>
        <Link to="/login"><FlatButton {...props} key={1} label="Login"/></Link>
        <Link to="/signup"><FlatButton {...props} key={2} label="Signup"/></Link>
    </div>
);

Login.muiName = 'FlatButton';


const Logged = (props) => {
    const LogoutMenuItem = withRouter((props) => (
        <MenuItem primaryText="Sign out"
                  onTouchTap={() => {
                      const { history } = props;
                      Auth.deauthenticateUser();
                      history.push('/');
                  }}
        />
    ));
    return (<IconMenu
        {...props}
        iconButtonElement={
            <IconButton><MoreVertIcon /></IconButton>
        }
        targetOrigin={{horizontal: 'right', vertical: 'top'}}
        anchorOrigin={{horizontal: 'right', vertical: 'top'}}
    >
        {/*<MenuItem primaryText="Refresh" />*/}
        {/*<MenuItem primaryText="Help" />*/}
        {<LogoutMenuItem/>}

    </IconMenu>);
};



Logged.muiName = 'IconMenu';


class Base extends React.Component {
    /**
     * Class constructor.
     */
    constructor(props) {
        super(props);

    }

    render() {
        return (
            <div>
                <AppBar
                    title="Explore.AT!"
                    showMenuIconButton = {false}
                    iconElementRight={Auth.isUserAuthenticated() ? <Logged/> : <Login/>}
                />
                {this.props.children}
            </div>
        );
    }
}

Base.propTypes = {
    children: PropTypes.object.isRequired
};

export default Base;