#!/bin/bash

VERSION=0.1.0
SUBJECT=add-es-user
USAGE="Usage: add_es_user email hashed_password"

SGCONFIG_DIR='/home/exploreat/sgconfig'

SG_INTERNAL_USERS='sg_internal_users.yml'
SG_ROLES_MAPPING='sg_roles_mapping.yml'


# --- Options processing -------------------------------------------
if [ $# == 0 ] ; then
    echo $USAGE
    exit 1;
fi

MAIL=$1
PASSWORD=$2
STRIPPED_EMAIL=`echo $MAIL | sed 's/\./_/g'`

echo $MAIL
echo $STRIPPED_EMAIL


echo "  - \"$STRIPPED_EMAIL\" " >> $SGCONFIG_DIR/$SG_ROLES_MAPPING
echo -e "$STRIPPED_EMAIL:\n  hash: $PASSWORD\n  username: $MAIL" >> $SGCONFIG_DIR/$SG_INTERNAL_USERS

source /usr/share/elasticsearch/plugins/search-guard-2/tools/sgadmin.sh -ts /etc/letsencrypt/truststore.jks -tspass $3 -ks /etc/letsencrypt/admin-keystore.jks -kspass $4 -cd $SGCONFIG_DIR -h exploreat.usal.es -nhnv -cn exploreat
