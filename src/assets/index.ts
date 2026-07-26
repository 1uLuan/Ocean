//icons
import folderIcon from '/usr/share/icons/WhiteSur/places/scalable/folder-yellow.svg'
import zipIcon from '/usr/share/icons/WhiteSur/mimes/scalable/zip.svg'

//text
import textIcon from '/usr/share/icons/WhiteSur/mimes/scalable/txt.svg'
import yamlIcon from '/usr/share/icons/WhiteSur/mimes/scalable/text-yaml.svg'
import mdIcon from '/usr/share/icons/WhiteSur/mimes/scalable/text-markdown.svg'
import jsonIcon from '/usr/share/icons/WhiteSur/mimes/scalable/application-json.svg'
import htmlIcon from '/usr/share/icons/WhiteSur/mimes/scalable/html.svg'
import jsIcon from '/usr/share/icons/WhiteSur/mimes/scalable/javascript.svg'
import tsIcon from '/usr/share/icons/WhiteSur/mimes/scalable/text-x-typescript.svg'
import cssIcon from '/usr/share/icons/WhiteSur/mimes/scalable/text-css.svg'
import rustIcon from '/usr/share/icons/WhiteSur/mimes/scalable/text-rust.svg'
import tomlIcon from '/usr/share/icons/WhiteSur/mimes/scalable/application-toml.svg'
import pyIcon from '/usr/share/icons/WhiteSur/mimes/scalable/text-x-python.svg'
import dllIcon from '/usr/share/icons/WhiteSur/mimes/scalable/gnome-exe-thumbnailer-generic-x.svg'

import imageIcon from '/usr/share/icons/WhiteSur/mimes/scalable/image-x-ico.svg'
import audioIcon from '/usr/share/icons/WhiteSur/mimes/scalable/audio-x-generic.svg'
import videoIcon from '/usr/share/icons/WhiteSur/mimes/scalable/video-x-generic.svg'

//execs
import execIcon from '/usr/share/icons/WhiteSur/mimes/scalable/exec.svg'
import shIcon from '/usr/share/icons/WhiteSur/mimes/scalable/shellscript.svg'

import unknownIcon from '/usr/share/icons/WhiteSur/mimes/scalable/unknown.svg'

export const icons: Record<string, string> = {

  folder: folderIcon,
  zip: zipIcon,

  //image
  png: imageIcon,
  jpg: imageIcon,
  jpeg: imageIcon,
  gif: imageIcon,
  webp: imageIcon,
  bmp: imageIcon,
  svg: imageIcon,
  tiff: imageIcon,
  tif: imageIcon,
  heic: imageIcon,
  heif: imageIcon,
  avif: imageIcon,
  ico: imageIcon,
  icns: imageIcon,
  //Text
  txt: textIcon,
  'plain text': textIcon,
  log: textIcon,
  yaml: yamlIcon,
  md: mdIcon,
  json: jsonIcon,
  html: htmlIcon,
  js: jsIcon,
  ts: tsIcon,
  css: cssIcon,
  rs: rustIcon,
  jsx: jsIcon,
  tsx: tsIcon,
  toml: tomlIcon,
  py: pyIcon,
  lock: textIcon,
  dll: dllIcon,

  //Video
  mp4: videoIcon,
  mkv: videoIcon,
  mov: videoIcon,
  avi: videoIcon,
  webm: videoIcon,
  m4v: videoIcon,
  '3gp': videoIcon,
  flv: videoIcon,
  wmv: videoIcon,
  mpeg: videoIcon,
  mpg: videoIcon,
  m2ts: videoIcon,
  mts: videoIcon,
  ogv: videoIcon,

  //Audio
  mp3: audioIcon,
  wav: audioIcon,
  flac: audioIcon,
  aac: audioIcon,
  ogg: audioIcon,
  oga: audioIcon,
  m4a: audioIcon,
  opus: audioIcon,
  wma: audioIcon,
  aiff: audioIcon,
  aif: audioIcon,
  mid: audioIcon,
  midi: audioIcon,
  amr: audioIcon,

  //Excec
  sh: shIcon,
  bash: execIcon,
  zsh: execIcon,
  fish: execIcon,
  run: execIcon,
  bin: execIcon,
  out: execIcon,
  appimage: execIcon,
  exe: execIcon,

  unknown: unknownIcon,
}
