#!/usr/bin/env python3
import sys
import os
from bs4 import BeautifulSoup
import urllib
import requests
import json
from io import open as iopen
import re
from stop_words import get_stop_words
import networkx as nx
from networkx.readwrite import json_graph


stop_words = get_stop_words('de')

def cleanXMLTagContent(stripped_text):
	text = re.sub(r'\n\s*\n', r' ', stripped_text, flags=re.M)
	return ' '.join(text.split())

# if not os.path.exists(conference_download_dir):
# 	os.makedirs(conference_download_dir)

concept_regex = re.compile(r"mconcept|concept:(.*)")

concepts_num = []
coincident_num = []

with iopen('./frage-fragebogen-full-tgd01.xml') as frage_file,\
	 iopen('./dboe-concept-features-fs-lod-tei.xml') as concepts_file:
	
	#Read the xml
	xml_soup = BeautifulSoup(frage_file,'lxml')
	concepts_soup = BeautifulSoup(concepts_file, 'lxml')

	questionnaires = xml_soup.find_all('list', attrs={"n":True})
	words = xml_soup.find_all('seg', attrs={"xml:id":True})
	global_concepts = xml_soup.find_all('interp', attrs={"corresp":True})


	def f(x): 
		return x is not None and x not in stop_words and "." not in x and len(x) > 1

	question_words = list(filter(f,words))

	question_words_set = set(question_words)

	print(str(len(question_words)))
	print(str(len(question_words_set)))

	print('There are {} questionnaires'.format(len(questionnaires)))
	print('There are {} words'.format(len(words)))
	print('There are {} concepts'.format(len(global_concepts)))

	for questionnaire in questionnaires:
		coincident_groups = {}
		G = nx.Graph()
		H = nx.Graph()
		questionnaire_obj = {}
		items = questionnaire.find_all('item')
		print('Questionnaire {} has {} questions'.format(questionnaire.label.string,len(items)))
		for item in items:
			concepts = item.find_all('seg', attrs={"xml:id":True})
			if len(concepts) > 0:
				# print('Question {} relates to the following concepts:'.format(item.get('n')))
				concepts_set = set()
				for concept in concepts:
					# print(concept.string)
					if f(concept.string):
						concepts_set.add(concept.string)
					# result = concept_regex.match(concept.get('corresp'))
					# if result is not None:
					# 	concept_entry = concepts_soup.find('fs', attrs={"xml:id":result.group(1)})
					# 	concepts_set.add(result.group(1))
				# print(concepts_set)
	
				G.add_node(item.get('n'), concepts=[concept for concept in concepts_set])
				for key, val in questionnaire_obj.items():
					coincidences = concepts_set.intersection(val)
					if len(coincidences) > 0:
						# print(concepts_set, val, coincidences)
						G.add_edge(item.get('n'), key, weight=len(coincidences), 
							coincidences=[coincidence for coincidence in coincidences])
						if len(coincidences) in coincident_groups:
							added = False
							from_reps = -1
							from_index = -1
							# print(str(coincident_groups));
							for rep_key, rep_concepts in coincident_groups[len(coincidences)].items():
								for index, group in enumerate(rep_concepts):
									a_set = set(group)
									if a_set == coincidences:
										from_reps = rep_key
										from_index = index
										added = True
										break
							if added:
								if from_reps != -1 and from_index != -1:
									move_group = coincident_groups[len(coincidences)][from_reps].pop(from_index)
									if (from_reps + 1) in coincident_groups[len(coincidences)]:
										coincident_groups[len(coincidences)][from_reps + 1].append(move_group)
									else:
										coincident_groups[len(coincidences)][from_reps + 1] = [move_group]
								else:
									print('Error: indexes must be set')
									exit(1)
							else:
								if 1 in coincident_groups[len(coincidences)]:
									coincident_groups[len(coincidences)][1].append([coincidence for coincidence in coincidences])
								else:
									coincident_groups[len(coincidences)] = {1 : [[coincidence for coincidence in coincidences]]}		
						else:
							print('Adding {} in level {}'.format(coincidences, len(coincidences)))
							coincident_groups[len(coincidences)] = {1 : [[coincidence for coincidence in coincidences]]}


				questionnaire_obj[item.get('n')] = concepts_set

		data = json_graph.node_link_data(G)
		concepts_set = set()
		coincident_concepts_set = set()
		groups_number = -1

		for node in data['nodes']:
			for concept in node['concepts']:
				concepts_set.add(concept)

		key_list = list(coincident_groups.keys())
		for k in key_list:
			key_2_list = list(coincident_groups[k].keys())
			for i in key_2_list:
				if len(coincident_groups[k][i]) == 0:
					del coincident_groups[k][i]
				else:
					for coincidency_group in coincident_groups[k][i]:
						if k > 1:
							groups_number+=1
						coincident_concepts_set.update([coincidency_group_item for coincidency_group_item in coincidency_group])
					

		data['coincident_groups'] = coincident_groups

		for link in data['links']:
			if link['weight'] > 1:
				coinc_set = set(link['coincidences'])
				for key, val in coincident_groups[len(link['coincidences'])].items():
					for index, terms_array in enumerate(val):
						if coinc_set == set(terms_array):
							link['target_group'] = [len(coinc_set), key, index]
							break
		
		intersection_set = coincident_concepts_set.intersection(concepts_set)

		concepts_num.append(len(concepts_set))
		coincident_num.append(len(intersection_set))
		
 
		if len(intersection_set) > 0:
		# print('Coincident: \n' + json.dumps(coincident_groups, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ': ')))
			print('There are {} different concepts, of which {} appear in {} coincidency groups ({}%)'
				.format(len(concepts_set), len(intersection_set), groups_number, len(intersection_set) / len(concepts_set) * 100))
		else:
			print('There are {} different concepts, and 0 appear in coincidency groups)'.format(len(concepts_set)))

		with iopen('../data/{}-graph.json'.format(questionnaire.label.string.replace(" ","").lower()),'w', encoding='utf-8') as jsonfile:
			json.dump(data, jsonfile, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ': '))

	print('Concepts Max/min is {}, {} coincident: {}, {}'.format(max(concepts_num), min(concepts_num), max(coincident_num), min(coincident_num)))


	frage_file.close()
	concepts_file.close()

#^.*, (.*\d$)*  Pages


