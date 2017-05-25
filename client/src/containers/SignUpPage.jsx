import React from 'react';
import Redirect from 'react-router-dom/Redirect';
import Base from '../components/Base.jsx';
import SignUpForm from '../components/SignUpForm.jsx';
import BaseGrid from '../components/BaseGrid.jsx'
import { withStyles, createStyleSheet } from 'material-ui/styles';

const styleSheet = createStyleSheet('SignUpPage', () => ({
    card: {
        padding: 12,
        textAlign: 'center'
    },
    grid: {
        paddingTop: 10
    }
}));


class SignUpPage extends React.Component {

    /**
     * Class constructor.
     */
    constructor(props) {
        super(props);

        // set the initial component state
        this.state = {
            errors: {},
            user: {
                email: '',
                password: '',
                passwordRepeat: '',
                about: '',
                passwordsMatch: true,
                canSubmit: false
            },
            successMessage: '',
            didSignup: false
        };

        this.processForm = this.processForm.bind(this);
        this.changeUser = this.changeUser.bind(this);
    }

    /**
     * Process the form.
     *
     * @param {object} event - the JavaScript event object
     */
    processForm(event) {
        // prevent default action. in this case, action is the form submission event
        event.preventDefault();

        // create a string for an HTTP body message
        const email = encodeURIComponent(this.state.user.email);
        const password = encodeURIComponent(this.state.user.password);
        const about = encodeURIComponent(this.state.user.about);
        const formData = `email=${email}&password=${password}&about=${about}`;

        // create an AJAX request
        const xhr = new XMLHttpRequest();
        xhr.open('post', '/auth/signup');
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.responseType = 'json';
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                // success

                // change the component-container state
                this.setState({
                    errors: {},
                    didSignup: true,
                    successMessage: xhr.response.message
                });
            } else {
                // failure

                const errors = xhr.response.errors ? xhr.response.errors : {};
                errors.summary = xhr.response.message;

                this.setState({
                    errors
                });
            }
        });
        xhr.send(formData);
    }

    /**
     * Change the user object.
     *
     * @param {object} event - the JavaScript event object
     */
    changeUser(event) {
        const field = event.target.id;
        const user = this.state.user;
        user[field] = event.target.value;

        if (field == 'password' || field == 'passwordRepeat') {
            user.passwordsMatch = user.password === user.passwordRepeat;
        }

        user.canSubmit = ["email","password","passwordRepeat"].reduce((acc, val) => acc && user[val].length > 0, true)
            && user.passwordsMatch;

        this.setState({
            user
        });
    }


    /**
     * Render the component.
     */
    render() {
        return this.state.didSignup ?
            (<Redirect to={{
                pathname: '/',
                state: {
                    headline : "Thank you!",
                    message: this.state.successMessage
                }
            }} />)
            :(
                <Base>
                    <BaseGrid>
                        <SignUpForm
                            onSubmit={this.processForm}
                            onChange={this.changeUser}
                            errors={this.state.errors}
                            user={this.state.user}
                        />
                    </BaseGrid>
                </Base>
            );
    }
}

export default withStyles(styleSheet)(SignUpPage);