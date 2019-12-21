FROM node:8.9.4-alpine

# be sure to pull down your proxydata from s3 into the ./proxydata dir
# (e.g. see ses/ and geo/ config.js comments)
# configure config.js files for each service as desired.

# docker build -t testing .
# docker tag testing:latest 617890639961.dkr.ecr.us-west-2.amazonaws.com/brendantest:ses_r1234
# docker push 617890639961.dkr.ecr.us-west-2.amazonaws.com/brendantest:ses_r1234

# see https://github.cms.gov/CMS-WDS/nava-load-testing/tools for a docker-compose.yml

WORKDIR /var/core/app
COPY . /var/core/app/

# Install npm dependencies supressing the output
RUN npm install --quiet

WORKDIR /var/core/app
