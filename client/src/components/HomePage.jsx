import React from 'react';
import PropTypes from 'prop-types';
import Base from '../components/Base.jsx';
import BaseGrid from '../components/BaseGrid.jsx'
import Card, { CardContent } from 'material-ui/Card';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Typography from 'material-ui/Typography';




const styleSheet = createStyleSheet('HomePage', () => ({
    card: {
        padding: 12,
        textAlign: 'center',
        minWidth: 275
    },
    // grid: {
    //     paddingTop: 10
    // }
}));


const HomePage = (props) => (
    <Base>
        <BaseGrid>
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
        </BaseGrid>
    </Base>
);

// HomePage.propTypes = {
//     classes: PropTypes.object.isRequired,
// };

export default withStyles(styleSheet)(HomePage);
