import React from 'react';
import PropTypes from 'prop-types';
import Base from '../components/Base.jsx';
import BaseGrid from '../components/BaseGrid.jsx'
import { withStyles, createStyleSheet } from 'material-ui/styles';
import SimplePaper from '../components/SimplePaper.jsx';

const styleSheet = createStyleSheet('HomePage', () => ({

}));


const ConfirmPage = (props) => {
    let headline = "ExploreAT! Prototypes",
        message = "This is the home page of the ExploreAT project visual prototypes";
    if (props.location.state !== undefined) {
        headline = props.location.state.headline;
        message = props.location.state.message;
    }
    return (
        <Base>
            <BaseGrid>
                <SimplePaper headline={headline} message={message}/>
            </BaseGrid>
        </Base>
    );
}

// HomePage.propTypes = {
//     headline: PropTypes.string.isRequired,
//     message: PropTypes.string.isRequired
// };

export default withStyles(styleSheet)(ConfirmPage);
