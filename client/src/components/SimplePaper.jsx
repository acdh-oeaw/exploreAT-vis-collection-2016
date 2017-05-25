import React from 'react';
import PropTypes from 'prop-types';
import Paper from 'material-ui/Paper';
import Typography from 'material-ui/Typography';
import Link  from 'react-router-dom/Link';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Button from 'material-ui/Button'

const styleSheet = createStyleSheet('HomePage', () => ({
    simple_paper: {
        padding: 12,
        textAlign: 'center',
        minWidth: 275,
        maxWidth: 320
    },
    button: {
        padding: 12
    }
}));


const SimplePaper= (props) => {
    return (
        <Paper className={props.classes.simple_paper}>
            <Typography type="headline">
                {props.headline}
            </Typography>
            <Typography type="subheading">
                {props.message}
            </Typography>
                {props.link && <div className={props.classes.button}><Link  to={{pathname: '/', state: {}}}>
                                    <Button raised primary key={1}>Home</Button>
                                </Link></div>}
        </Paper>
    );
};

SimplePaper.propTypes = {
    headline: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired
};

export default withStyles(styleSheet)(SimplePaper);

