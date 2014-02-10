all : unpack-examples list-logs


unpack-examples: htdocs/data/example/wispy.01.txt

htdocs/data/example/wispy.01.txt : htdocs/data/example/wispy.01.txt.gz
	gunzip -c < $< > $@


LOG_FILES = $(shell find -L htdocs/data -type f -a -not -name "*.gz" -a -not -name ".*" -a -not -name list.txt | sort)


list-logs : htdocs/data/list.txt

htdocs/data/list.txt : force $(LOG_FILES)
	@echo "rebuilding log file list..."
	@echo $^ | sed -e 's/^force //' | tr ' ' '\n' | sed -e 's@^htdocs/@@' > $@


.PHONY : force

