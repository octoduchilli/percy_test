#!/bin/sh
aws s3 cp --region=eu-west-1 --acl=public-read --recursive ./markup/ 's3://appaloosa-website-2018-test/'
