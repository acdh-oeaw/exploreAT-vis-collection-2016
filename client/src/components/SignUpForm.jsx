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
        minHeight: 275
    },
    container: {
        // display: 'flex',
        // justifyContent: 'center',
        // flexDirection: 'column'
    },
    actions: {
        justifyContent: 'center'
    },
    typography: {
        // paddingTop: 8,
        // order: 2
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
            <Typography type="subheading">
                {errors.summary && <p className="error-message">{errors.summary}</p>}
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
            <Button form="signupForm" type="submit" raised={true} primary>Sign up</Button>
        </CardActions>
        <CardContent>
            <Typography type="body1" className={classes.typography}>
                Already have an account? <Link to={'/login'}>Log in</Link>.
            </Typography>
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