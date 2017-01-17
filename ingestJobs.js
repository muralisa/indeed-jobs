var async = require('async');
var unirest = require('unirest');
var publisherKey = 'YOUR-PUBLISHER-KEY-HERE'; //TODO: update this value with the API key from your publisher account
var NUM_JOBS_PER_PAGE=25;

function Job(jobKey, title, desc, companyName, location, country, jobUrl) {
    this.jobKey = jobKey;
    this.title = title;
    this.description = desc;
    this.companyName = companyName;
    this.location = location;
    this.country = country;
    this.jobUrl = jobUrl
}

function fetchIndeedJobsGeo(company, country, index, parentCallback) {
    if (company && company.companyName) {
        country = country ? country : 'us';
    var companyName = company.companyName.replace(' Inc.', '');
    companyName = companyName.replace(',', '');
    console.log('Fetching indeed jobs for: ' + companyName);
    //LOGGER.debug('Fetching indeed jobs for: ' + companyName);
    async.waterfall([
        function(callback) {
            var request = unirest
            .get(
                "http://api.indeed.com/ads/apisearch?publisher="
                + publisherKey
                + "&v=2&format=json&q=company%3A"
                + companyName
                + "&co="
                + country
                + "&sort=date&radius=25&start="
                + index
                + "&limit=25&fromage=90&highlight=0&filter=1&latlong=0&chnl=&userip=1.2.3.4&useragent=Mozilla%2F5.0%20(Windows%20NT%206.3%3B%20WOW64)%20AppleWebKit%2F537.36%20(")
            .timeout(30000);

            request.end(function(response){
                if(response){
                    callback(null, response);
                }
                else { 
                    callback('error fetching indeed jobs for company: ' +company.companyName+ ', startIndex: '+index);
                }
            });
        }, function(response, callback) {
            if(response.status==200 && response.body) {
                var parsedResponse = null;
                try {
                    parsedResponse = JSON.parse(response.body);
                } catch (e) {
                    // Most of the times, this happens because
                    // the body is already a JSON object, so just assign it
                    parsedResponse = response.body;
                }
                if (parsedResponse && parsedResponse.results) {
                    var results = parsedResponse.results;
                    var totalResults = parsedResponse.totalResults;
                    if(totalResults<index) {
                        callback(null, [], totalResults);
                    }
                    else {
                        callback(null, results, totalResults);
                    }
                } else {
                    callback('Invalid results when fetching indeed jobs for company: ' +company.companyName+ ', startIndex: '+index);
                }
            }
            else if(response.status==200 && !response.body){
                callback('error fetching indeed jobs for company: ' +company.companyName+ ', startIndex: '+index+". Error E1918");
            }
            else {
                callback('error fetching indeed jobs for company: ' +company.companyName+ ', startIndex: '+index);
            }
        }, function(results, totalResults, callback){
            var jobs = [];
            for(var i=0; i<results.length; i++) {
                var indeedJob = results[i];
                var dummyString = "not provided for indeed crawled jobs";
                var sourceName = 'indeed';
                var newJob = new Job(
                    indeedJob.jobkey,
                    indeedJob.jobtitle,
                    indeedJob.snippet,
                    indeedJob.company,
                    indeedJob.formattedLocation,
                    country,
                    indeedJob.url);
                jobs.push(newJob);
            }
            parentCallback(null, jobs, totalResults);

        }], function(err) {
            //LOGGER.error('Error: fetchIndeedJobsGeo(' + company.companyName + ') - ' + err);
            parentCallback(null, [], 0);
        });
    } else {
        parentCallback('Invalid company info passed for: fetchIndeedJobs');
    }
}

function fetchIndeedJobs(company, index, parentCallback){
    fetchIndeedJobsGeo(company, 'us', index, parentCallback);
};

function fetchIndeedJobsMultiGeo(company, index, countries, parentCallback) {
    var jobModels = [];
    var totalResults = 0;
    async.map(countries, function(country, cb) {
        //LOGGER.debug('[' + index + '] Fetching jobs for: ' + company.companyName + ' in: ' + country);
        fetchIndeedJobsGeo(company, country, index, function(err, jobs, count) {
            //LOGGER.debug('[' + index + ']Finished fetching jobs for ' + company.companyName + ' in: ' + country);
            if (!err && jobs && jobs.length) {
                //LOGGER.debug('Results: ' + jobs.length + ', ' + count);
                jobModels = jobModels.concat(jobs);
                if (count > 0) {
                    totalResults = totalResults + count;
                }
                if (count < NUM_JOBS_PER_PAGE) {
                    var indx = countries.indexOf(country);
                    countries.splice(indx,1);         // ignore for future pages
                }
                cb();
            } else {
                var indx = countries.indexOf(country);
                countries.splice(indx,1);         // ignore for future pages
                if (err) {
                    //LOGGER.error('fetchIndeedJobsMultiGeo: ' + err);
                }
                cb();
            }
        });
    }, function(err) {
        //LOGGER.debug('Fetched ' + totalResults + ' jobs for ' + company.companyName);
        parentCallback(null, jobModels, totalResults);
    });
}

module.exports.fetchIndeedJobs = fetchIndeedJobs;
module.exports.fetchIndeedJobsMultiGeo = fetchIndeedJobsMultiGeo;