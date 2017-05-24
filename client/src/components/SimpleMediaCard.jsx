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
    cover: {
        width: 300
    },
    typoDiv: {
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center',
        minHeight: 80
    }
});

function SpecialLink(props) {
    return (
        props.open_tab ?
            <Link to={props.link} target="_blank"> {props.children} </Link>
            :
            <Link to={props.link}> {props.children} </Link>
    );
}

function SimpleMediaCard(props) {
    const classes = props.classes;
    const cardInfo = props.cardInfo;
    return (
        <Card className={classes.card}>
            <Typography type="title" component="h2">
                {cardInfo.title}
            </Typography>
            <CardMedia>
                <SpecialLink {...cardInfo.href}> <img className={classes.cover} src={cardInfo.image_src}/></SpecialLink>
                {/*<img className={classes.cover} src={cardInfo.image_src}/>*/}
            </CardMedia>
            <Divider light/>
            <div className={classes.typoDiv}>
                <Typography type="body1" component="p" secondary={true}>
                    {cardInfo.text}
                </Typography>
            </div>
        </Card>
    );
}

SimpleMediaCard.propTypes = {
    classes: PropTypes.object.isRequired,
    cardInfo: PropTypes.object.isRequired
};

export default withStyles(styleSheet)(SimpleMediaCard);