import React from 'react';
import Auth from '../modules/Auth';
import Base from '../components/Base.jsx';
import Dashboard from '../components/Dashboard.jsx';


class DashboardPage extends React.Component {

    /**
     * Class constructor.
     */
    constructor(props) {
        super(props);

        this.state = {
            secretData: '',
            errorMessage: ''
        };
    }

    /**
     * This method will be executed after initial rendering.
     */
    componentDidMount() {
        const xhr = new XMLHttpRequest();
        xhr.open('get', '/api/dashboard');
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        // set the authorization HTTP header
        xhr.setRequestHeader('Authorization', `JWT ${Auth.getToken()}`);
        xhr.responseType = 'json';
        xhr.addEventListener('load', () => {
            console.log(xhr);
            if (xhr.status === 200) {
                this.setState({
                    secretData: xhr.response.message
                });
            } else if (xhr.status === 401) {
                Auth.deauthenticateUser();
                this.setState({
                    errorMessage: xhr.response.message
                });
            }
        });
        xhr.send();
    }

    /**
     * Render the component.
     */
    render() {
        return (<Base><Dashboard secretData={this.state.secretData} /></Base>);
    }

}

export default DashboardPage;