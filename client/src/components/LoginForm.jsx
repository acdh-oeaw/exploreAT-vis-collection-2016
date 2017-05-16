import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Card, { CardContent } from 'material-ui/Card';
import Button from 'material-ui/Button'
import TextField from 'material-ui/TextField';
import Typography from 'material-ui/Typography';
import { withStyles, createStyleSheet } from 'material-ui/styles';

const styleSheet = createStyleSheet('LoginForm', () => ({
    card: {
        padding: 12,
        textAlign: 'center'
    },
    container: {
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column'
    },
    typography: {
        paddingTop: 16,
        order: 2
    },
    input: {
        margin: 'auto',
        padding: 16,
        width: '70%'
    },
    form: {
        order: 1,
    }
}));

const LoginForm = ({
                       onSubmit,
                       onChange,
                       errors,
                       successMessage,
                       user,
                       classes
                   }) => (
    <Card className={classes.card}>
        <CardContent>
            <Typography type="headline">
                Login
            </Typography>
            <Typography type="subheading">
                {successMessage && <p className="success-message">{successMessage}</p>}
                {errors.summary && <p className="error-message">{errors.summary}</p>}
            </Typography>

            <div className={classes.container}>
                <form action="/" onSubmit={onSubmit} className={classes.form}>
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

                    <Button type="submit" raised={true} primary>Log in</Button>
                </form>
                <Typography type="body1" className={classes.typography}>
                    Don't have an account? <Link to={'/signup'}>Create one</Link>.
                </Typography>
            </div>
        </CardContent>
    </Card>
);

LoginForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    errors: PropTypes.object.isRequired,
    successMessage: PropTypes.string.isRequired,
    user: PropTypes.object.isRequired
};

export default withStyles(styleSheet)(LoginForm);
