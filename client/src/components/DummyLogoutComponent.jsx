import { Component } from 'react';
import Auth from '../modules/Auth';

class DummyLogoutComponent extends Component {
    componentWillMount() {
        const { history } = this.props;
        Auth.deauthenticateUser();
        history.push('/');
    }

    render() {
        return null;
    }
}

export default DummyLogoutComponent;
