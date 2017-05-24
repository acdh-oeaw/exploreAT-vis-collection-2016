// @flow weak

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Grid from 'material-ui/Grid';
import { LabelRadio, RadioGroup } from 'material-ui/Radio';
import Paper from 'material-ui/Paper';
import { FormLabel } from 'material-ui/Form';

const styleSheet = createStyleSheet('BaseGrid', () => {
    return {
        root: {
            flexGrow: 1,
            paddingTop: 24
        },
        demo: {
            minHeight: 340,
        },
        // paper: {
        //     padding: 12,
        //     height: '100%',
        // },
        // control: {
        //     padding: 12,
        // },
    };
});

class BaseGrid extends Component {
    state = {
        direction: 'row',
        justify: 'center',
        align: 'center',
        gutter: '24',
    };


    render() {
        const classes = this.props.classes;
        const {
            align,
            direction,
            justify,
            gutter
        } = this.state;

        return (
            <Grid container
                  className={classes.root}>
                <Grid item xs={12}>
                    <Grid container
                          className={classes.demo}
                          align={align}
                          direction={direction}
                          justify={justify}
                          gutter={Number(gutter)}>
                      {React.Children.map(this.props.children, (child, i) => {
                          return (  <Grid key={i} item>
                                        {child}
                                    </Grid>);
                      })}
                    </Grid>
                </Grid>
            </Grid>
        );
    }
}

BaseGrid.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default withStyles(styleSheet)(BaseGrid);