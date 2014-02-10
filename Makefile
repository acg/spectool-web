
all : unpack-examples

unpack-examples: htdocs/data/example/wispy.01.txt

htdocs/data/example/wispy.01.txt : htdocs/data/example/wispy.01.txt.gz
	gunzip -c < $< > $@

