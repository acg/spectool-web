# A web viewer for RF spectrum data #

**Afternoon project. Work in progress! Big fat warning.**

This project complements [Spectrum Tools](https://www.kismetwireless.net/spectools/) with a web viewer for historical spectrum data.

Typical uses:

* Wireless site surveys.
* Monitoring wireless spectrum usage.
* Diagnosing wireless problems after the fact.

The Spectool Web Viewer shows data captured by the [spectool_raw](http://manpages.ubuntu.com/manpages/hardy/man1/spectool_raw.1.html) program.

## Usage ##

Short version:

    make
    make serve

To import your `spectool_raw` log files, copy or symlink them into htdocs/data/, run make again, and refresh the page.

## Screenshot ##

![Spectool Web Viewer](./htdocs/img/spectool-web-screenshot-2014.02.11.png)

## Author ##

Copyright (c) 2014
Alan Grow <alangrow+nospam@gmail.com>
