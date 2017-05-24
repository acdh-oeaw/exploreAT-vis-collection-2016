import React from 'react';
import PropTypes from 'prop-types';
import Card, { CardContent, CardHeader, CardMedia } from 'material-ui/Card';
import { withStyles, createStyleSheet } from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import Divider from 'material-ui/Divider';


const styleSheet = createStyleSheet('Dashboard', () => ({
    // card: {
    //     maxWidth: 345,
    //     textAlign: 'center',
    //     padding: 5
    // },
    // content: {
    //     flex: '1 0 auto'
    // }
}));


const Dashboard = (props) => {

};

// const Dashboard = (props) => (
//     <div>
//         <Card className={props.classes.card}>
//             <CardHeader
//                 title="Dashboard"
//                 subheader="You should get access to this page only after authentication."
//             />
//             <CardContent>
//                 <Typography type="body1">
//                     {props.secretData}
//                 </Typography>
//             </CardContent>
//         </Card>
//         <Card className={props.classes.card}>
//             <CardContent>
//                 <Typography type="headline">
//                     Dashboard
//                 </Typography>
//                 <Typography type="subheading">
//                     You should get access to this page only after authentication.
//                 </Typography>
//                 <Typography type="body1">
//                     {props.secretData}
//                 </Typography>
//             </CardContent>
//         </Card>
//     </div>
// );



Dashboard.propTypes = {
    secretData: PropTypes.string.isRequired
};

export default withStyles(styleSheet)(Dashboard);