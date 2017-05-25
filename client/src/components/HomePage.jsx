import React from 'react';
import PropTypes from 'prop-types';
import Base from '../components/Base.jsx';
import BaseGrid from '../components/BaseGrid.jsx'
import Link  from 'react-router-dom/Link';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import SimplePaper from '../components/SimplePaper.jsx';
import Button from 'material-ui/Button'

const styleSheet = createStyleSheet('HomePage', () => ({

}));

function getUrlParams(search) {
    let hashes = search.slice(search.indexOf('?') + 1).split('&')
    let params = {}
    hashes.map(hash => {
        let [key, val] = hash.split('=')
        params[key] = decodeURIComponent(val)
    })

    return params
}

function setStateWithProps(props) {
    if (props.location.state !== undefined
        && props.location.state.headline
        && props.location.state.message) {
        return {
            headline : props.location.state.headline,
            message : props.location.state.message
        }
    } else if (props.location.search && props.location.search.length > 0) {
        const urlParams = getUrlParams(props.location.search);
        if (urlParams.hasOwnProperty('email')) {
            return {
                headline : 'Thank you',
                message : `User account ${urlParams['email']} has been confirmed`
            }
        } else {
            return {
                headline: 'Ohps!',
                message : `There was a problem activating the user account ${props.match.params.email}`
            }
        }
    }

    return {
        headline: "ExploreAT! Prototypes",
        message : "This is the home page of the ExploreAT project visual prototypes"
    };
}

class HomePage extends React.Component {
    constructor(props) {
        super(props);

        this.state = setStateWithProps(props);
        console.log(this.state);
    }

    componentWillReceiveProps(nextProps) {
        console.log('will receive props');
        let state = setStateWithProps(nextProps);
        if (state.headline !== this.state.headline || state.message !== this.state.headline) {
            console.log('set state receive props');
            this.setState(state);
        }
    }

    render() {
        const component = this.props.location.pathname === "/confirm" ?
            <SimplePaper headline={this.state.headline} message={this.state.message} link="/" /> :
            <SimplePaper headline={this.state.headline} message={this.state.message} />;

        return (
            <Base>
                <div>
                    <BaseGrid>
                        {component}
                    </BaseGrid>
                </div>
            </Base>
        );
    }
}


// HomePage.propTypes = {
//     headline: PropTypes.string.isRequired,
//     message: PropTypes.string.isRequired
// };

export default withStyles(styleSheet)(HomePage);
