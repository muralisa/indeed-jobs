var ingestor = require('./controller/ingestJobs');
var countries = ['us', 'gb'];

var company = {
	'companyName' : 'Facebook'
};

ingestor.fetchIndeedJobsMultiGeo(
	company,
	1,
	countries,
	function(err, results) {
		console.log('Finished fetching: ' + results.length + ' jobs.');
		console.log(results);
	}
);