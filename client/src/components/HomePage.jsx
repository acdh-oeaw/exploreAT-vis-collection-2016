import React from 'react';
import PropTypes from 'prop-types';
import Base from '../components/Base.jsx';
import BaseGrid from '../components/BaseGrid.jsx'
import Paper from 'material-ui/Paper';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Typography from 'material-ui/Typography';




const styleSheet = createStyleSheet('HomePage', () => ({
    card: {
        padding: 12,
        textAlign: 'center',
        minWidth: 275,
        maxWidth: 320
    },
    // grid: {
    //     paddingTop: 10
    // }
}));


const HomePage = (props) => {
    let headline = "ExploreAT! Prototypes",
        message = "This is the home page of the ExploreAT project visual prototypes";
    if (props.location.state !== undefined) {
        headline = props.location.state.headline;
        message = props.location.state.message;
    }
    return (
            <Base>
                <BaseGrid>
                    <Paper className={props.classes.card}>
                        <Typography type="headline">
                            {headline}
                        </Typography>
                        <Typography type="subheading">
                            {message}
                        </Typography>
                    </Paper>
                </BaseGrid>
            </Base>
        );
}

// HomePage.propTypes = {
//     headline: PropTypes.string.isRequired,
//     message: PropTypes.string.isRequired
// };

export default withStyles(styleSheet)(HomePage);
