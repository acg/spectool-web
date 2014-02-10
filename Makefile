
all : unpack-data

unpack-data : htdocs/data/wispy.01.txt

htdocs/data/wispy.01.txt : htdocs/data/wispy.01.txt.gz
	gunzip -c < $< > $@

