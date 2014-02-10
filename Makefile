
all : unpack-examples list-logs


unpack-examples: htdocs/data/example/wispy.01.txt

htdocs/data/example/wispy.01.txt : htdocs/data/example/wispy.01.txt.gz
	gunzip -c < $< > $@


LOG_FILES = $(shell find htdocs/data -type f -a -not -name "*.gz" -a -not -name ".*" -a -not -name list.txt)

list-logs : htdocs/data/list.txt

htdocs/data/list.txt : $(LOG_FILES)
	@echo $^ | tr ' ' '\n' | sed -e 's@^htdocs/@@' > $@

