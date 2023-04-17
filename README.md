# MIDI Generator

MIDI Generator is a Node.js project that generates a random MIDI file or streams with a given scale, phrase length, and note lengths. It uses the [tonal](https://www.npmjs.com/package/tonal) and [midi-writer-js](https://www.npmjs.com/package/midi-writer-js) packages to generate MIDI notes and write them to a file.

## Usage

### Running Via Prebuilt Executable 

#### Download From Latest Release

Download an executable from the latest [release](https://github.com/ammilam/midi-generator/releases/tag/latest).

#### Make Executable

```bash
chmod +x midi-generator-<arch>
```

#### Run The Executable

To run the project, use the following command:

```bash
./midi-generator-<arch> --key=<KEY> --mode=<MODE> --phrase_notes_count=<PHRASE_NOTES_COUNT> --note_durations=<note_durations> --min_octave=<MIN_OCTAVE> --max_octave=<MAX_OCTAVE> --file_name=<FILE_NAME>
--note_spread=<NOTE_SPREAD>
```

#### Options

Parameters:
To generate MIDI files, the app.js file has various command line parameters. The parameters are:
- note_durations: set the durations of the notes. The durations take integer values like 1, 2, 3 etc, where each integer represents a particular note length. 'd' prefixed to the integer represents a dotted note of that duration. 't' suffixed to an integer represents a triplet of that duration.
- arp: if set, correlates to arpeggio direction, either "u" (up), "d" (down), or "ud" (up-down)
- play_chords: play through random chords instead of individual notes (true/false)
- triplet_chance: chance that the note will switch to a triplet note duration at random
- generate_midi_stream: set this parameter to "true" (default is "true"). This will continuously generate MIDI notes until the program is terminated. If set to "false", a midi file will be generated 
- skip_notes_chance: chance that a notes played in a measure will be randomly skipped (default "0.0", range 0.0 to 0.99)
- note_spread: corresponds to how many notes can potentially sit on top of each other, potentially representing a chord
- randomize_note_spread: will select a random length between 1 and the value of note_spread to generate randomly sized chords
- bpm: set the beats per minute (default 120)
- phrase_count: set the number of phrases to be generated (default 1)
- phrase_notes_count: set the number of notes in each phrase (default 32)
- min_octave: set the minimum octave range (default 1)
- max_octave: set the maximum octave range (default 5)
- key: set the key of the scale (default "C")
- mode: set the mode of the scale (default "major")
- file_name: set the name of the generated MIDI file (default "C-major-midi-file-<date_str>.mid")
- output_path: set the output path for the generated MIDI file (default "./")

##### Generating a MIDI Stream

To generate a MIDI stream, set the following parameters:
- generate_midi_stream: set this parameter to "true" (default is "false"). This will continuously generate MIDI notes until the program is terminated. 
- skip_notes_chance: set the chance that a notes played in a measure will be randomly skipped (default "0.0", range 0.0 to 0.99)

```bash
./midi-generator-<arch> --key=D# --mode=dorian --note_spread=3 --bpm=140 --velocity=100 --generate_midi_stream="true" --midi_channel=7 --randomize_note_spread
```

##### note_durations parameters

Since this is a wrapper around [midi-writer-js](https://www.npmjs.com/package/midi-writer-js), this application accepts the following note_durations options:

- 1 : whole
- 2 : half
- d2 : dotted half
- dd2 : double dotted half
- 4 : quarter
- 4t : quarter triplet
- d4 : dotted quarter
- dd4 : double dotted quarter
- 8 : eighth
- 8t : eighth triplet
- d8 : dotted eighth
- dd8 : double dotted eighth
- 16 : sixteenth
- 16t : sixteenth triplet
- 32 : thirty-second
- 64 : sixty-fourth
- Tn : where n is an explicit number of ticks (T128 = 1 beat)


#### Example usage

```bash
./midi-generator-<arch> --note_spread=2 --phrase_count=2 --phrase_notes_count=16 --note_durations=8,4 --min_octave=2 --max_octave=4 --key=C --mode=minor --file_name="my-midi-file.mid"
```

This will generate a MIDI file with 2 phrases, each phrase in C minor containing 16 notes with a random chord of up to 2 notes, with note lengths of 1/8 or 1/4 of a beat, in a D# minor scale with notes ranging from octave 2 to octave 4, and with the name "my-midi-file.mid".

Note: All arguments are optional. If no option is specified, the default values will be used.


### Building From Source

#### Initializing The Project

1. Clone the repository.
2. Run `npm install` to install the required packages.
3. Run `npm install --global pkg` to install the `pkg` package for creating an executable.

## Dependencies

This tool relies on the following dependencies:

- [tonal](https://www.npmjs.com/package/tonal): A music theory library for Node.js.
- [midi-writer-js](https://www.npmjs.com/package/midi-writer-js): A MIDI file writer library for Node.js.
- fs: A Node.js file system module for reading and writing files.
- [yargs](https://www.npmjs.com/package/yargs): A command line argument parsing library for Node.js.
- [easymidi](https://www.npmjs.com/package/easymidi): A simple event-based MIDI messaging wrapper for node-midi, used to stream midi over a midi_channel

## Contributors

- **Andrew Milam** - [ammilam](https://github.com/ammilam)
