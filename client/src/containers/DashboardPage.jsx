import React from 'react';
import { Redirect } from 'react-router-dom';
import Auth from '../modules/Auth';
import Base from '../components/Base.jsx';
// import Dashboard from '../components/Dashboard.jsx';
import BaseGrid from '../components/BaseGrid.jsx'
import SimpleMediaCard from '../components/SimpleMediaCard.jsx';

import { withStyles, createStyleSheet } from 'material-ui/styles';


class DashboardPage extends React.Component {

    /**
     * Class constructor.
     */
    constructor(props) {
        super(props);
        this.state = {
            cardsInfo: [],
            errorMessage: '',
            version: ''
        };

        if (props.match.params.version === undefined) {
            this.setDefaultCards(false);
        }
    }

    /**
     * This method will be executed after initial rendering.
     */
    componentDidUpdate(prevProps, prevState) {
        if (this.props.match.params.version === prevProps.match.params.version &&
            this.state.cardsInfo.length !== 0) return;
        if (this.props.match.params.version === '3' ||
            this.props.match.params.version === '4') {
            const xhr = new XMLHttpRequest();
            xhr.open('get', `/api/dashboard/${this.props.match.params.version}`);
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            // set the authorization HTTP header
            xhr.setRequestHeader('Authorization', `JWT ${Auth.getToken()}`);
            xhr.responseType = 'json';
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    console.log(xhr);
                    this.setState({
                        cardsInfo: xhr.response.cardsInfo
                    });
                } else if (xhr.status === 401) {
                    Auth.deauthenticateUser();
                    this.setState({
                        errorMessage: xhr.response.message
                    });
                }
            });
            xhr.send();
        } else {
            this.setDefaultCards(true);
        }
    }

    /**
     * Render the component.
     */
    render() {
        return Auth.isUserAuthenticated() ?

            (<Base>
                <BaseGrid>
                    {this.state.cardsInfo.map( (cardInfo) => (<SimpleMediaCard key={cardInfo.id} cardInfo={cardInfo}/>))}
                </BaseGrid>
            </Base>) :

            (<Redirect to={{
                pathname: '/login',
                state: { from: this.props.location }
            }}/>);
    }

    setDefaultCards (setState) {
        let state = this.state;
        const { match } = this.props;
        state.cardsInfo = [
            {"id": 1,
                "image_src": "/exploreat-v3/img/home/ex_words_sources.png",
                "href": {
                    "link": `${match.url.split('/').slice(0, -1).join('/')}/3`,
                    "open_tab": false
                },
                "title": "2016 Prototypes",
                "text": "Access to the visual prototypes made during the first year of ExploreAT!"},
            {"id": 2,
                "image_src": "/exploreat-v3/img/home/ex_words_sources.png",
                "href": {
                    "link": `${match.url.split('/').slice(0, -1).join('/')}/4`,
                    "open_tab": false
                },
                "title": "2017 Prototypes",
                "text": "Access to the visual prototypes made during the second year of ExploreAT!"}
        ];
        if (setState)
            this.setState(state);
    }
}

export default DashboardPage;