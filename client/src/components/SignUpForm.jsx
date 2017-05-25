import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Card, { CardContent, CardActions } from 'material-ui/Card';
import Button from 'material-ui/Button'
import TextField from 'material-ui/TextField';
import Typography from 'material-ui/Typography';
import { withStyles, createStyleSheet } from 'material-ui/styles';


const styleSheet = createStyleSheet('SignupForm', () => ({
    card: {
        padding: 12,
        textAlign: 'center',
        minHeight: 470,
        width: 300
    },
    container: {
        paddingTop: 10
    },
    errorMessage: {
        color: "red",
        paddingTop: 5
    },
    actions: {
        justifyContent: 'center'
    },
    input: {
        // margin: 'auto',
        // // padding: 16,
        // width: '80%'
    },
    form: {
        // order: 1,
    }
}));

const SignUpForm = ({
                        onSubmit,
                        onChange,
                        errors,
                        user,
                        classes
                    }) => (
    <Card className={classes.card}>
        <CardContent>
            <Typography type="headline">
                Signup
            </Typography>
            <div className={classes.container}>
                <form id="signupForm" action="/" onSubmit={onSubmit} className={classes.form}>
                    <TextField
                        className={classes.input}
                        required
                        label="Email"
                        id="email"
                        // errorText={errors.email}
                        onChange={onChange}
                        value={user.email}
                    />

                    <TextField
                        className={classes.input}
                        required
                        label="Password"
                        id="password"
                        type="password"
                        onChange={onChange}
                        // errorText={errors.password}
                        value={user.password}
                    />

                    <TextField
                        className={classes.input}
                        required
                        label="Repeat password"
                        id="passwordRepeat"
                        type="password"
                        onChange={onChange}
                        // errorText={errors.password}
                        value={user.passwordRepeat}
                    />

                    {/*const formData = `email=${email}&password=${password}&about=${about}`;*/}

                    <TextField
                        className={classes.input}
                        placeholder="Tell us about yourself: Affiliation, current field of study, how you got to know the project, etc."
                        // label={"About yourself " + (120 - user.about) + ""}
                        label={`About yourself (${user.about.length}/120)`}
                        id="about"
                        multiline
                        inputProps={{"maxLength": 120}}
                        rows = "4"
                        rowsMax = "4"
                        onChange={onChange}
                        // errorText={errors.password}
                        value={user.about}
                    />
                </form>
            </div>
        </CardContent>
        <CardActions className={classes.actions}>
            {user.canSubmit && <Button form="signupForm" type="submit" raised={true} primary>Sign up</Button>}
            {!user.canSubmit && <Button form="signupForm" type="submit" disabled={true} raised={true} primary>Sign up</Button>}
        </CardActions>
        <CardContent>
            <div>
            <Typography type="body1">
                Already have an account? <Link to={'/login'}>Log in</Link>
            </Typography>
            <Typography type="body1" className={classes.errorMessage}>
                {(!user.passwordsMatch && "Passwords don't match") || (errors.summary && errors.summary)}
            </Typography>
            </div>

        </CardContent>

    </Card>
);

SignUpForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    errors: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired
};


export default withStyles(styleSheet)(SignUpForm);