const { Client, Util } = require('discord.js');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');

const TOKEN = "NTAxOTE1OTE3MDY0NzMyNjcz.DqgVVA.2sAwQa7UmyzGNfof5jOdZfmDdgI";
const PREFIX = ".";
const GOOGLE_API_KEY = "AIzaSyCZRB0V31b_ElpFwHsuGqKilZSUnjcO1jM";
const client = new Client({ disableEveryone: true });

const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => {
console.log('Ready')
client.user.setStatus("idle");
}
);

client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

client.on('reconnecting', () => console.log('I am reconnecting now!'))


client.on('message', async (msg) => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)

	if (command === "p") {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('`You Must Be in VoiceChannel.`');
				if (voiceChannel) {msg.member.voiceChannel.join();}
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('`I Dont Have CONNECT Permission`');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('`I Dont Have SPEAK Permission`');
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send("`Added:` " + playlist.title + " ` To Queue`");
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					msg.channel.send("```" + `${videos.map(video2 => `${++index} - ${video2.title}`).join('\n')}` + "```").then(message => message.channel.send("```By : Naz```"));
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('اختر يا  حبيب ناي ');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('مالقيت الاغنية يا حبيب ناي');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === "s") {
		if (!msg.member.voiceChannel) return msg.channel.send('`You Must Be in VoiceChannel`');
		if (!serverQueue) return msg.channel.send('`Theres nothing to skip it`');
			 
		serverQueue.connection.dispatcher.end('`Skiped`');
		return undefined;
	} else if (command === "st") {
		if (!msg.member.voiceChannel) return msg.channel.send('`You Must Be in VoiceChannel`');
		if (!serverQueue) return msg.channel.send('`Theres nothing to skip it`');
		serverQueue.songs = [];
				  
		serverQueue.connection.dispatcher.end('`Stoped it`');
		return undefined;
	} else if (command === "v") {
		if (!msg.member.voiceChannel) return msg.channel.send('`You Must Be in VoiceChannel`');
		if (!args[1]) return msg.channel.send("`Vol: " + `**${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send("`Volume Changed to:`" + `**${args[1]}**`);
	} else if (command === 'np') {
		if (!serverQueue) return msg.channel.send('`Theres nothing playing`');
		return msg.channel.send("`Now Playing: `" + `**${serverQueue.songs[0].title}**`);
	} else if (command === 'q') {
		if (!serverQueue) return msg.channel.send('`Theres nothing in the queue`');
		return msg.channel.send("`Queue`").then(msg => msg.channel.send("```" + `${serverQueue.songs.map(song => `- ${song.title}`).join('\n')}
????: ${serverQueue.songs[0].title}` + "```"))
	} else if (command === "pa") {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			  client.user.setPresence({
  status: 'idle',
  game: {
     type: 3,
     name: "Song Paused.",
     state: "Song Paused.",
    application_id: '402584133924159509',
     assets: {
        large_image: `402584133924159509`,
        large_text: `Volume: ${serverQueue.volume}` }

  }
    });
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('`I Pause The Song`');
		}
		return msg.channel.send('`Theres Nothing To Pause it`');
	} else if (command === 'res') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			
			return msg.channel.send('`I Resume The Song For You`');
			
		}
		return msg.channel.send('`Theres nothing to resume it`');
	}

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 1,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`Theres proplem is: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(`Added:` + "`" + `${song.title}` + "`" + " To The Queue");
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
					  client.user.setPresence({
  status: 'idle',
  game: {
     type: 3,
     name: song.title,
     state: "Song Ended.",
    application_id: '402584133924159509',
     assets: {
        large_image: `402584133924159509`,
        large_text: `Volume: ${serverQueue.volume}/5` }

  }
    });
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
	
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send("`Playing:`").then(msg => msg.channel.send("```" + `${song.title}` + "```"));
  const mm = song.title || "Nothing";
  client.user.setStatus("idle");

setInterval(function(){ 

  client.user.setPresence({
  status: 'idle',
  game: {
     type: 3,
     name: mm,
     state: "Playing: `" + mm + "`",
    application_id: '402584133924159509',
     assets: {
        large_image: `402584133924159509`,
        large_text: `Volume: ${serverQueue.volume}/5` }

  }
    });
 }, 10000);
}

client.login("NDAyNTg0MTMzOTI0MTU5NTA5.Drb2BA.Zkxq0bI1DumMcfKU35mJU8hhyx8");