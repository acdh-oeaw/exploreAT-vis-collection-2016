const mongoose = require('mongoose'),
    User = require('./user'),
    nev = require('email-verification')(mongoose),
    bcrypt = require('bcrypt');

module.exports.connect = (uri, emailPassword) => {
    mongoose.connect(uri);
    // plug in the promise library:
    mongoose.Promise = global.Promise;

    mongoose.connection.on('error', (err) => {
        console.error(`Mongoose connection error: ${err}`);
        process.exit(1);
    });

    nev.configure({
        verificationURL: 'http://localhost:3000/auth/approve/${URL}',
        persistentUserModel: User,
        tempUserCollection: 'exploreat_tempusers',

        transportOptions: {
            service: 'Gmail',
            auth: {
                user: 'grial@usal.es',
                pass: emailPassword
            }
        },
        verifyMailOptions: {
            from: 'Do Not Reply <grial_do_not_reply@usal.es>',
            subject: 'Please confirm user account',
            html: '</p>A new user is requesting access to the exploreat prototype.</p>' +
                    '<p> Here there are the details:' +
                     '<ul>' +
                         '<li><strong>Email: </strong>${EMAIL}</li>' +
                         '<li><strong>About me: </strong>${ABOUT}</li>' +
                     '</ul>' +
                    '</p>' +
                    '<p>Click here to confirm account: ${URL}</p>',
            text: 'A new user is requesting access to the exploreat prototype. Here there are the details:' +
            ' ${EMAIL}, ${ABOUT}. Click here to confirm: ${URL}'
        },
        confirmMailOptions: {
            from: 'Do Not Reply <grial_do_not_reply@usal.es>',
            subject: 'Your account is ready to use!',
            html: '<p>Your account has been approved!</p>',
            text: 'Your account has been approved!'
        },
        hashingFunction: (password, tempUserData, insertTempUser, callback) => {
            bcrypt.genSalt((saltError, salt) => {
                if (saltError) { return callback(saltError); }
                bcrypt.hash(password, salt, (hashError, hash) => {
                    return insertTempUser(hash, tempUserData, callback);
                });
            });
        }
    }, function(error, options){
        if (error)
            console.log(error);
        else
            nev.generateTempUserModel(User, (err, tempUserModel) => {
                if (err)
                    console.log('error generating temp user model');
                else
                    console.log('temp user model generated');
            });
    });
};


module.exports.nev = nev;