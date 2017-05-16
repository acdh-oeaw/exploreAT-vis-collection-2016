import React from 'react';
import PropTypes from 'prop-types';
import Base from '../components/Base.jsx';
import Card, { CardContent } from 'material-ui/Card';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';



const styleSheet = createStyleSheet('HomePage', () => ({
    card: {
        padding: 12,
        textAlign: 'center'
    },
}));


const HomePage = (props) => (
    <Base>
        <Grid item xs={6}>
            <Card className={props.classes.card}>
                <CardContent>
                    <Typography type="headline">
                        ExploreAT! Prototypes
                    </Typography>
                    <Typography type="subheading">
                        This is the home page of the ExploreAT project visual prototypes.
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    </Base>
);

// HomePage.propTypes = {
//     classes: PropTypes.object.isRequired,
// };

export default withStyles(styleSheet)(HomePage);
