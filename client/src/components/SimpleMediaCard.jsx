// @flow
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Card, { CardMedia } from 'material-ui/Card';
import Typography from 'material-ui/Typography';
import Divider from 'material-ui/Divider';

const styleSheet = createStyleSheet('SimpleMediaCard', {
    card: {
        maxWidth: 300,
        textAlign: 'center',
        padding: 5
    },
});

function SimpleMediaCard(props) {
    const classes = props.classes;
    const cardInfo = props.cardInfo;
    return (
        <Card className={classes.card}>
            <Typography type="headline" component="h2">
                {cardInfo.title}
            </Typography>
            <CardMedia>
                <Link to={cardInfo.href}> <img src={cardInfo.image_src}/> </Link>
            </CardMedia>
            <Divider light/>
            <Typography type="body1" component="p" secondary={true}>
                {cardInfo.text}
            </Typography>
        </Card>
    );
}

SimpleMediaCard.propTypes = {
    classes: PropTypes.object.isRequired,
    cardInfo: PropTypes.object.isRequired
};

export default withStyles(styleSheet)(SimpleMediaCard);