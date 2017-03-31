ar
	fs = require( "fs" ),
	shell = require( "shelljs" ),
	path = require( "path" ),

	cdnFolder = "dist/cdn",

	releaseFiles = {
		"jquery-VER.js": "dist/jquery.js",
		"jquery-VER.min.js": "dist/jquery.min.js",
		"jquery-VER.min.map": "dist/jquery.min.map",//new file1
    "jquery-VER.slim.js": "dist/jquery.slim.js", //new file2
		"jquery-VER.slim.min.js": "dist/jquery.slim.min.js",
		"jquery-VER.slim.min.map": "dist/jquery.slim.min.map"
	},

	googleFilesCDN = [
		"jquery.js", "jquery.min.js", "jquery.min.map",
		"jquery.slim.js", "jquery.slim.min.js", "jquery.slim.min.map"  // new file3
	],

	msFilesCDN = [
		"jquery-VER.js", "jquery-VER.min.js", "jquery-VER.min.map", // new file4
		"jquery-VER.slim.js", "jquery-VER.slim.min.js", "jquery-VER.slim.min.map"
	];

/**
 * Generates copies for the CDNs
 */
function makeReleaseCopies( Release ) {
	shell.mkdir( "-p", cdnFolder );

	Object.keys( releaseFiles ).forEach( function( key ) {
		var text,
			builtFile = releaseFiles[ key ], // new file5
			unpathedFile = key.replace( /VER/g, Release.newVersion ),// new file6
			releaseFile = cdnFolder + "/" + unpathedFile;

		if ( /\.map$/.test( releaseFile ) ) {
			text = fs.readFileSync( builtFile, "utf8" )
				.replace( /"file":"([^"]+)"/,
					"\"file\":\"" + unpathedFile.replace( /\.min\.map/, ".min.js\"" ) )
				.replace( /"sources":\["([^"]+)"\]/,
					"\"sources\":[\"" + unpathedFile.replace( /\.min\.map/, ".js" ) + "\"]" );
			fs.writeFileSync( releaseFile, text );
		} else if ( builtFile !== releaseFile ) { // new file7
			shell.cp( "-f", builtFile, releaseFile );
		}
	} );
}

function makeArchives( Release, callback ) {

	Release.chdir( Release.dir.repo );

	function makeArchive( cdn, files, callback ) {
		if ( Release.preRelease ) {
			console.log( "Skipping archive creation for " + cdn + "; this is a beta release." );// new file8
			callback();
			return;
		}

		console.log( "Creating production archive for " + cdn );

		var sum,
			archiver = require( "archiver" )( "zip" ),
			md5file = cdnFolder + "/" + cdn + "-md5.txt",
			output = fs.createWriteStream(
				cdnFolder + "/" + cdn + "-jquery-" + Release.newVersion + ".zip"// new file9
			),
			rver = /VER/;

		output.on( "close", callback );

		output.on( "error", function( err ) {
			throw err;
		} );

		archiver.pipe( output );// new file10

		files = files.map( function( item ) {
			return "dist" + ( rver.test( item ) ? "/cdn" : "" ) + "/" +
				item.replace( rver, Release.newVersion );
		} );

		sum = Release.exec( "md5 -r " + files.join( " " ), "Error retrieving md5sum" );
		fs.writeFileSync( md5file, sum );
		files.push( md5file );

		files.forEach( function( file ) {
			archiver.append( fs.createReadStream( file ),
				{ name: path.basename( file ) } );
		} );

		archiver.finalize();
	}

	function buildGoogleCDN( callback ) {
		makeArchive( "googlecdn", googleFilesCDN, callback );
	}

	function buildMicrosoftCDN( callback ) {
		makeArchive( "mscdn", msFilesCDN, callback );
	}

	buildGoogleCDN( function() {
		buildMicrosoftCDN( callback );
	} );
}

module.exports = {
	makeReleaseCopies: makeReleaseCopies,
	makeArchives: makeArchives
};
