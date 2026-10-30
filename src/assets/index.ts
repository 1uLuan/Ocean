//icons
import folderIcon from '/home/luan/.local/share/icons/Colloid/places/scalable/folder.svg'
import zipIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/zip.svg'

//text
import textIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/txt.svg'
import yamlIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/application-x-yaml.svg'
import mdIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/text-markdown.svg'
import jsonIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/application-json.svg'
import htmlIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/html.svg'
import jsIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/javascript.svg'
import tsIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/text-x-typescript.svg'
import cssIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/text-css.svg'
import rustIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/text-rust.svg'
import tomlIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/text-plain.svg'
import pyIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/text-x-python.svg'
import dllIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/gnome-exe-thumbnailer-generic-x.svg'

import imageIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/image-x-ico.svg'
import audioIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/audio-x-generic.svg'
import videoIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/video-x-generic.svg'

//execs
import execIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/exec.svg'
import shIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/shellscript.svg'

import unknownIcon from '/home/luan/.local/share/icons/Colloid/mimetypes/scalable/unknown.svg'

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
