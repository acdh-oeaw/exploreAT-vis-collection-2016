import React from 'react';
import PropTypes from 'prop-types';
import Card, { CardContent } from 'material-ui/Card';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';

const styleSheet = createStyleSheet('Dashboard', () => ({
    card: {
        padding: 12,
        textAlign: 'center'
    },
}));

const Dashboard = (props) => (
    <Card className={props.classes.card}>
        <CardContent>
            <Typography type="headline">
                Dashboard
            </Typography>
            <Typography type="subheading">
                You should get access to this page only after authentication.
            </Typography>
            <Typography type="body1">
                {props.secretData}
            </Typography>
        </CardContent>
    </Card>
);

Dashboard.propTypes = {
    secretData: PropTypes.string.isRequired
};

export default withStyles(styleSheet)(Dashboard);